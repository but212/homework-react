# 4주차 회고

## 내부 페이지에 SPA 적용하기

### 문제상황 - 빈 화면만 나오는 버그

week-4 내부에도 spa 라우팅을 적용하려고 했는데 빈 화면만 나오는 버그가 발생했습니다.

```tsx
<BrowserRouter>
  <Routes>
    <Route path='/' element={<Home />} />
    <Route path='/week-3' element={<Week3 />} />
    <Route path='/week-4/' element={<Week4 />} />
  </Routes>
</BrowserRouter>
```

### 해결책 - 와일드카드(*) 사용

라우팅을 적용할 때 와일드카드(*)를 사용해야 한다는 것을 검색을 통해 알아내고 수정했습니다.

```tsx
<BrowserRouter>
  <Routes>
    <Route path='/' element={<Home />} />
    <Route path='/week-3' element={<Week3 />} />
    <Route path='/week-4/*' element={<Week4 />} />
  </Routes>
</BrowserRouter>
```

## SignIn, SignUp 페이지 구현

SignIn, SignUp 페이지는 강사님의 예제에서 참고해서 react-router-dom에 맞춘 버전으로 구현했습니다.

## 회원가입에서 auth에는 저장이되는데 profile에는 저장이 안되는 버그

이건 auth에 메타데이터가 저장이 완료되기도 전에 메타데이터를 가져오려고 했기 때문에 발생한 문제였습니다.

### 변경전 - userMetadata를 바로 가져오려고 했음

signUp 요청을 날리고 바로 userMetadata를 가져오려고 했는데 auth에 메타데이터가 저장이 완료되지 않았기 때문에
userMetadata가 undefined가 되었습니다.

```tsx
const onSubmit = async (formData: SignupForm) => {
    if (isSubmitting) return;

    const { error, data } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          bio: formData.bio,
        },
      },
    });

    if (error) {
      toast.error(`회원가입 오류 발생 ${error.message}`);
    } else {
      const userMetadata = data.user?.user_metadata;
      const userId = data.user?.id;
      const userEmail = data.user?.email;

      if (userMetadata && userId && userEmail) {
        const { error: profileError } = await supabase.from('profile').insert({
          id: userId,
          user_name: userMetadata.user_name,
          email: userEmail,
          phone: '',
          bio: formData.bio,
        });

        if (profileError) {
          toast.error(`회원가입 오류 발생 ${profileError.message}`);
        } else {
          toast.success(`회원가입 성공 ${userMetadata.user_name}`);
          reset();
        }
      } else {
        toast.error('회원정보를 저장할 수 없습니다.');
      }
    }
  };
```

### 변경 후 - 1000ms의 저장을 완료할 시간을 줌

```tsx
const onSubmit = async (formData: SignupForm) => {
  if (isSubmitting) return;

  const { error, data } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        bio: formData.bio,
      },
    },
  });

  if (error) {
    toast.error(`회원가입 오류 발생 ${error.message}`);
  } else {
    if (data.user) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 세션 정보가 저장될 시간을 줌

      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        const { error: profileError } = await supabase.from("profile").insert({
          id: data.user.id,
          user_name: formData.name,
          email: data.user.email!,
          phone: "",
          bio: formData.bio || "",
        });

        if (profileError) {
          toast.error(`프로필 생성 오류: ${profileError.message}`);
        } else {
          toast.success(`회원가입 성공 ${formData.name}`);
          reset();
        }
      } else {
        toast.error("세션 생성에 실패했습니다. 다시 시도해주세요.");
      }
    } else {
      toast.error("회원정보를 저장할 수 없습니다.");
    }
  }
};
```

## 세션 불러오기 실패

하지만 이래놓고 보니 지속적으로 세션 불러오는 것을 실패했다는 토스트 메시지가 떠서 AI를 통해 알아보니 supabase.auth.signUP에서
이메일 인증을 해야하는 경우 즉시 세션을 생성하지 않는다는 것을 알게 되었습니다.

이를 해결하기 위해 signUp 시 그냥 사용자에게 이메일만 확인하게 하고 AI가 생성해준 SQL 트리거 함수를 통해 자동으로 profile을 생성하게 했습니다.

```tsx
const onSubmit = async (formData: SignupForm) => {
  if (isSubmitting) return;

  const { error, data } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      data: {
        name: formData.name,
        bio: formData.bio,
      },
      emailRedirectTo: `https://homework-react-gold.vercel.app/`,
    },
  });

  if (error) {
    toast.error(`회원가입 오류 발생 ${error.message}`);
  } else {
    if (data.user) {
      toast.success(`회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.`);
      reset();
      return;
    } else {
      toast.error("회원정보를 저장할 수 없습니다.");
    }
  }
};
```

```sql
-- 회원가입 시 자동으로 profile 생성하는 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profile (id, user_name, email, phone, bio)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    new.email,
    '',
    COALESCE(new.raw_user_meta_data->>'bio', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users 테이블에 트리거 설정
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## vercel 환경에서 새로고침시 404 에러

vercel 환경에서 새로고침시 404 에러가 발생했습니다. 이는 SPA가 해당 경로의 정적 페이지를 가지고 있지 않은데
F5를 누르면 해당 경로의 파일의 내용을 가져오기 때문입니다. vercel.json을 생성하여 해결했습니다.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 프로필 페이지에 수정/삭제 기능 넣기

프로필 페이지에 수정/삭제 기능을 추가하고자 계획을 수립했습니다.

### 나중을 위해 사용한 SQL 쿼리 문을 저장

데이터베이스를 가공하는 과정에서 사용된 쿼리문을 알아야지 나중에 데이터베이스의 테이블이 손상되거나 새로 다시
데이터베이스를 생성해야 할 때 재연이 가능하고 어떤 부분에서 실수했는지를 검색이든 AI한테 물어보든 할 수 있기 때문에
여태까지 했던 모든 쿼리문은 저장되어야 합니다. 데이터 수정 삭제에는 권한과 후처리가 동반 되어야 하기에 쿼리문이
지문으로 있어야지 어떤 문제가 있는지 캐치해내는게 용이하기 때문입니다.

```text
sql/
├── schema/      - 스키마 정의 쿼리문 -> 테이블, 트리거, 함수 정의 쿼리문
├── migrations/  - 마이그레이션 -> 데이터베이스의 테이블을 생성하거나 수정하는 쿼리문(날짜에 따라 분류)
└── queries/     - 데이터베이스를 가공하는 쿼리문(기능에 따른 분류)
```

이렇게 구성하면 나중에 데이터베이스를 다시 생성할 때 도움이 될 수 있으리라 생각됩니다.

### RPC 함수 및 클라이언트 사이드 삭제함수

클라이언트 사이드에서 먼저 profile을 삭제한 후
RPC 함수를 통해 auth.users 테이블을 삭제하는 함수를 구현했습니다.

```ts
export const deleteUserAccount = async () => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const { error: profileError } = await supabase.from('profile').delete().eq('id', user.id);

    if (profileError) {
      throw profileError;
    }

    const { error: deleteError } = await supabase.rpc('delete_user');

    if (deleteError) {
      throw deleteError;
    }

    return { success: true };
  } catch (error) {
    console.error('계정 삭제 실패:', error);
    throw error;
  }
};
```

이렇게 구현하면 클라이언트 사이드에서 계정을 삭제할 수 있습니다.
그리고 서버사이드에선 RPC 함수를 통해 auth.users 테이블을 삭제하는 함수를 구현했습니다.

```sql
-- 사용자 삭제를 위한 RPC 함수
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.users 테이블에서 현재 사용자 삭제
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
```

이렇게 구현하면 서버사이드에서 계정을 삭제할 수 있습니다. 이를 프로필 페이지에서 삭제 버튼을 눌렀을 때 호출하는 함수로 구현했습니다.
