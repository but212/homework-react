import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import FormContainer from '@/components/FormContainer';
import supabase from '@/lib/supabase';
import { cn } from '@/lib/utils';

type LoginForm = {
  email: string;
  password: string;
};

const SignIn = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    mode: 'onChange',
  });

  const onSubmit = async (formData: LoginForm) => {
    if (isSubmitting) return;

    const { error, data } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      toast.error(`로그인 오류 발생 ${error.message}`);
    } else {
      if (data.user) {
        const { error: profileError, data: profile } = await supabase
          .from('profile')
          .select('user_name')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          toast.error(`프로필 정보 오류: ${profileError.message}`);
          return;
        }

        const displayName = profile?.user_name || data.user.user_metadata?.name || '사용자';

        toast.success(`로그인 성공 ${displayName}`, {
          action: {
            label: '홈으로 이동',
            onClick: () => {
              navigate('/week-4/home');
              reset();
            },
          },
        });
      }
    }
  };

  return (
    <FormContainer title='로그인'>
      <form onSubmit={handleSubmit(onSubmit)} aria-label='로그인 폼' autoComplete='off' noValidate>
        <div className='mb-4'>
          <label htmlFor='signin-email' className='block font-medium mb-1'>
            이메일 <span className='text-red-500'>*</span>
          </label>
          <input
            type='email'
            id='signin-email'
            className={cn(
              'w-full px-3 py-2 border rounded focus:outline-none focus:ring',
              errors.email ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
            )}
            {...register('email', {
              required: '이메일을 입력해주세요',
            })}
          />
          {errors.email && (
            <div id='signin-email-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.email.message}
            </div>
          )}
        </div>
        <div className='mb-4'>
          <label htmlFor='signin-password' className='block font-medium mb-1'>
            비밀번호 <span className='text-red-500'>*</span>
          </label>
          <input
            type='password'
            id='signin-password'
            className={cn(
              'w-full px-3 py-2 border rounded focus:outline-none focus:ring',
              errors.password ? 'border-red-500 ring-red-300' : 'border-gray-300 focus:ring-blue-300'
            )}
            {...register('password', {
              required: '비밀번호를 입력해주세요',
            })}
          />
          {errors.password && (
            <div id='signin-password-error' className='text-red-500 text-sm mt-1' role='alert'>
              {errors.password.message}
            </div>
          )}
        </div>
        <button
          type='submit'
          aria-disabled={isSubmitting}
          className={cn(
            'cursor-pointer w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition',
            'aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
          )}
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </FormContainer>
  );
};

export default SignIn;
