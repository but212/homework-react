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

### 프로필 수정기능

프로필 수정기능을 구현하기 위해 EditProfileModal 컴포넌트를 구현해서 profile 페이지에서 isOpen prop을 통해 동적으로 불러올 수 있도록 했습니다.
그리고 auth의 updateUser 함수를 이용한 Auth 사용자 정보 수정과 updateProfile 함수를 이용한 profile 테이블 정보 수정을 구현했습니다.

## useAuth, usePersist 훅

인증 관련 부수효과가 너무 복잡하고 중복이 많아 이걸 중앙화 시키는 훅의 필요성이 커졌습니다.

```tsx
export const useAuth = () => {
  const [user, setUser, removeUser] = usePersist<PartialProfile | null>('week4_user', null);
  
  const [isLoading, , , setIsLoadingImmediate] = usePersist<boolean>('week4_auth_loading', true);

  const fetchUserProfile = useCallback(async (userId: string): Promise<PartialProfile | null> => {
    try {
      const { error: userProfileError, data: userProfile } = await supabase
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (userProfileError) {
        console.error('사용자 프로필 오류:', userProfileError.message);
        toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
        return null;
      }

      return userProfile;
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoadingImmediate(true);
    
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`로그인 오류 발생 ${error.message}`);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        
        if (profile) {
          setUser(profile);
          const displayName = profile.user_name || data.user.user_metadata?.name || '사용자';
          toast.success(`로그인 성공 ${displayName}`);
          return { success: true, user: profile };
        }
      }

      return { success: false, error: '사용자 정보를 가져올 수 없습니다.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`로그인 실패: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoadingImmediate(false);
    }
  }, [fetchUserProfile, setUser, setIsLoadingImmediate]);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(`로그아웃 실패: ${error.message}`);
        return { success: false, error: error.message };
      }

      // localStorage에서 사용자 정보 제거
      removeUser();
      toast.success('로그아웃 되었습니다.');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`로그아웃 실패: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }, [removeUser]);

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;

    const profile = await fetchUserProfile(user.id);
    if (profile) {
      setUser(profile);
    }
  }, [user?.id, fetchUserProfile, setUser]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 확인 오류:', error.message);
          removeUser();
          return;
        }

        if (session?.user) {
          if (!user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
        } else {
          if (user) {
            removeUser();
          }
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        removeUser();
      } finally {
        setIsLoadingImmediate(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          break;
        case 'SIGNED_OUT':
          removeUser();
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchUserProfile, setUser, removeUser, setIsLoadingImmediate]);

  return {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
    setUser,
  };
};
```

### 이를 통한 이점

이를 구현하면 간단하게 useAuth()를 통해서 로그인 여부를 확인 및 조작하는 함수 및 변수를 사용할 수 있습니다.

```tsx
// 변경 전
const [user, setUser] = useState<PartialProfile | null>(null);

useEffect(() => {
  const initializeAuth = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('세션 확인 오류:', error.message);
      return;
    }

    if (session?.user) {
      const { error: userProfileError, data: userProfile } = await supabase
        .from('profile')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userProfileError) {
        toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
      } else {
        setUser(userProfile);
      }
    }
  };

  initializeAuth();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    switch (event) {
      case 'SIGNED_IN':
        if (session?.user) {
          const { error: userProfileError, data: userProfile } = await supabase
            .from('profile')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userProfileError) {
            toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
          } else {
            setUser(userProfile);
          }
        }
        break;
      case 'SIGNED_OUT':
        setUser(null);
        break;
      default:
        break;
    }
  });
  return () => {
    subscription.unsubscribe();
  };
}, []);

// ...
onClick={async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    toast.error(`로그아웃 실패: ${error.message}`);
  } else {
    toast.success('로그아웃 되었습니다.');
  }
}}

/// 변경 후
const { user, logout } = useAuth();
// ...
onClick={logout}
```

이를 통한 중앙화는 디버깅의 이점과 중복코드를 줄이는 이점이 있습니다.

## 해결하지 못한 문제점 - 인증상태 확인 무한 로딩

로그인 후 새로 고침을 하고 다시 로그인 한 상태에서 UI가 굳는데 이 상태로 새로 고침하면 무한 로딩하는 문제가 발생하였습니다.

## 로그인 유지 포기

로그인 유지를 localStorage로 구현하려고 했으나 실패한것 같습니다. 원래 이는 JWT 토큰을 활용하여 토큰 만료기간 동안만 로그인 유지하는 방법을 구현해야 합니다. 결국 useAuth는 usePersist가 제거하였습니다.

```tsx
export const useAuth = () => {
  const [user, setUser] = useState<PartialProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserProfile = useCallback(async (userId: string): Promise<PartialProfile | null> => {
    try {
      const { error: userProfileError, data: userProfile } = await supabase
        .from('profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (userProfileError) {
        console.error('사용자 프로필 오류:', userProfileError.message);
        toast.error(`사용자 프로필 오류: ${userProfileError.message}`);
        return null;
      }

      return userProfile;
    } catch (error) {
      console.error('프로필 조회 실패:', error);
      return null;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(`로그인 오류 발생 ${error.message}`);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile = await fetchUserProfile(data.user.id);

          if (profile) {
            setUser(profile);
            const displayName = profile.user_name || data.user.user_metadata?.name || '사용자';
            toast.success(`로그인 성공 ${displayName}`);
            return { success: true, user: profile };
          }
        }

        return { success: false, error: '사용자 정보를 가져올 수 없습니다.' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        toast.error(`로그인 실패: ${errorMessage}`);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserProfile, setUser]
  );

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(`로그아웃 실패: ${error.message}`);
        return { success: false, error: error.message };
      }

      // 사용자 상태 제거
      setUser(null);
      toast.success('로그아웃 되었습니다.');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      toast.error(`로그아웃 실패: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        console.error('사용자 세션 확인 실패:', userError?.message);
        return;
      }

      const profile = await fetchUserProfile(currentUser.id);
      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error);
    }
  }, [fetchUserProfile, setUser]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 확인 오류:', error.message);
          setUser(null);
          return;
        }

        if (session?.user) {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error('사용자 세션 검증 실패:', userError?.message);
            setUser(null);
            return;
          }

          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('인증 초기화 실패:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      switch (event) {
        case 'SIGNED_IN':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          setIsLoading(false);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setIsLoading(false);
          break;
        case 'TOKEN_REFRESHED':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          break;
        case 'USER_UPDATED':
          if (session?.user) {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              setUser(profile);
            }
          }
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  };
};
```

## 느낀점

이번 주의 학습내용은 머리가 지끈거릴 정도였습니다. 예측가능한 환경이 아닌 서버환경과 연계 시켜야 하기 때문에
굉장히 어려웠습니다. 특히 sql문을 작성하고 데이터베이스를 연동하는 부분은 거의 AI의 도움이 절실했습니다
원래는 JWT토큰을 활용하여 토큰 만료기간 동안만 로그인 유지같을 걸 구현하려 했지만 시간이 없어서 스펙과 설정을 알아보지
못했던 것도 아쉽습니다.
그리고 무엇보다 인증상태 확인 무한 로딩 문제를 해결하지 못한 점이 아쉽습니다.
