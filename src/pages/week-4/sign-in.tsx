import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import FormContainer from '@/components/FormContainer';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';

type LoginForm = {
  email: string;
  password: string;
};

const SignIn = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    mode: 'onChange',
  });

  const onSubmit = async (formData: LoginForm) => {
    if (isSubmitting || isLoading) return;

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/week-4/home');
      reset();
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
        {error && (
          <div className='mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded' role='alert'>
            {error.message}
          </div>
        )}
        <button
          type='submit'
          aria-disabled={isSubmitting || isLoading}
          className={cn(
            'cursor-pointer w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition',
            'aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
          )}
        >
          {isSubmitting || isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </FormContainer>
  );
};

export default SignIn;
