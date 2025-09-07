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

이건 auth에 세션정보가 저장이 완료되기도 전에 메타데이터를 가져오려고 했기 때문에 발생한 문제였습니다.

### 변경전 - userMetadata를 바로 가져오려고 했음

signUp 요청을 날리고 바로 userMetadata를 가져오려고 했는데 auth에 세션정보가 저장이 완료되지 않았기 때문에
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

### 변경 후 - 500ms의 저장을 완료할 시간을 줌

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
      await new Promise((resolve) => setTimeout(resolve, 500)); // 세션 정보가 저장될 시간을 줌

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
