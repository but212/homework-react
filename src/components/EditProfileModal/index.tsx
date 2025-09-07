import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { type PartialProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { updateUserEmail, updateUserPassword } from '@/lib/utils/auth';
import { updateProfile } from '@/lib/utils/profile';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: PartialProfile | null;
}

interface ProfileForm {
  name: string;
  email: string;
  bio?: string;
  password?: string;
  confirmPassword?: string;
}

const EditProfileModal = ({ isOpen, onClose, user }: Props) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      bio: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedFields = watch();

  useEffect(() => {
    if (user && isOpen) {
      reset({
        name: user.user_name,
        email: user.email,
        bio: user.bio || '',
        password: '',
        confirmPassword: '',
      });
      setIsDirty(false);
    }
  }, [user, isOpen, reset]);

  useEffect(() => {
    if (user && isOpen) {
      const hasChanged =
        watchedFields.name !== user.user_name ||
        watchedFields.email !== user.email ||
        watchedFields.bio !== (user.bio || '') ||
        Boolean(watchedFields.password && watchedFields.password.length > 0);

      setIsDirty(hasChanged);
    }
  }, [watchedFields, user, isOpen]);

  const handleClose = () => {
    if (isDirty) {
      const result = window.confirm('변경사항이 있습니다. 정말로 닫으시겠습니까?');
      if (result) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;

    try {
      setIsSubmitting(true);

      if (data.email !== user.email) {
        await updateUserEmail(data.email);
        toast.success('이메일이 성공적으로 업데이트되었습니다.');
      }

      if (data.password && data.password.length > 0) {
        await updateUserPassword(data.password);
        toast.success('비밀번호가 성공적으로 업데이트되었습니다.');
      }

      if (data.name !== user.user_name) {
        await updateProfile({
          user_name: data.name,
        });
        toast.success('이름이 성공적으로 업데이트되었습니다.');
      }

      if (data.bio !== (user.bio || '')) {
        await updateProfile({
          bio: data.bio,
        });
        toast.success('소개가 성공적으로 업데이트되었습니다.');
      }

      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      toast.error(`프로필 업데이트에 실패했습니다: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return isOpen ? (
    <div
      className={cn('fixed', 'inset-0', 'bg-[rgba(0,0,0,0.5)]', 'flex', 'items-center', 'justify-center', 'z-50')}
      onClick={handleClose}
    >
      <div
        className={cn('bg-white', 'p-6', 'rounded-xl', 'w-4/5', 'h-4/5', 'shadow-lg', 'flex', 'flex-col')}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='edit-profile-modal-title'
      >
        <div className='flex justify-between'>
          <h2 id='edit-profile-modal-title' className='text-xl font-bold flex items-center'>
            프로필 편집
          </h2>
          <button onClick={handleClose} className='bg-gray-200 p-2 rounded hover:bg-gray-300 transition'>
            닫기
          </button>
        </div>
        <form>
          <div className='mb-4'>
            <label htmlFor='edit-profile-modal-name' className='block text-sm font-medium text-gray-700 mb-1'>
              이름
            </label>
            <input
              type='text'
              id='edit-profile-modal-name'
              className={cn('w-full p-2 border rounded-md', errors.name ? 'border-red-500' : 'border-gray-300')}
              {...register('name', {
                required: '이름은 필수입니다.',
                minLength: {
                  value: 2,
                  message: '이름은 최소 2자 이상이어야 합니다.',
                },
              })}
            />
            {errors.name && <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>}
          </div>

          <div className='mb-4'>
            <label htmlFor='edit-profile-modal-email' className='block text-sm font-medium text-gray-700 mb-1'>
              이메일
            </label>
            <input
              type='email'
              id='edit-profile-modal-email'
              className={cn('w-full p-2 border rounded-md', errors.email ? 'border-red-500' : 'border-gray-300')}
              {...register('email', {
                required: '이메일은 필수입니다.',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '올바른 이메일 형식이 아닙니다.',
                },
              })}
            />
            {errors.email && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
          </div>

          <div className='mb-4'>
            <label htmlFor='edit-profile-modal-bio' className='block text-sm font-medium text-gray-700 mb-1'>
              소개
            </label>
            <textarea
              id='edit-profile-modal-bio'
              rows={3}
              className={cn(
                'w-full p-2 border rounded-md resize-none',
                errors.bio ? 'border-red-500' : 'border-gray-300'
              )}
              {...register('bio', {
                maxLength: {
                  value: 200,
                  message: '소개는 200자 이하로 작성해주세요.',
                },
              })}
            />
            {errors.bio && <p className='text-red-500 text-sm mt-1'>{errors.bio.message}</p>}
          </div>

          <div className='mb-4'>
            <label htmlFor='edit-profile-modal-password' className='block text-sm font-medium text-gray-700 mb-1'>
              비밀번호 (변경 시에만 입력)
            </label>
            <input
              type='password'
              id='edit-profile-modal-password'
              className={cn('w-full p-2 border rounded-md', errors.password ? 'border-red-500' : 'border-gray-300')}
              {...register('password', {
                minLength: {
                  value: 6,
                  message: '비밀번호는 최소 6자 이상이어야 합니다.',
                },
              })}
            />
            {errors.password && <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>}
          </div>

          <div className='mb-6'>
            <label
              htmlFor='edit-profile-modal-confirm-password'
              className='block text-sm font-medium text-gray-700 mb-1'
            >
              비밀번호 확인
            </label>
            <input
              type='password'
              id='edit-profile-modal-confirm-password'
              className={cn(
                'w-full p-2 border rounded-md',
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              )}
              {...register('confirmPassword', {
                validate: (value, formValues) => {
                  if (formValues.password && !value) {
                    return '비밀번호 확인을 입력해주세요.';
                  }
                  if (formValues.password && value !== formValues.password) {
                    return '비밀번호가 일치하지 않습니다.';
                  }
                  return true;
                },
              })}
            />
            {errors.confirmPassword && <p className='text-red-500 text-sm mt-1'>{errors.confirmPassword.message}</p>}
          </div>

          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleClose}
              className='flex-1 bg-gray-200 p-2 rounded hover:bg-gray-300 transition'
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type='submit'
              disabled={!isDirty || isSubmitting}
              className={cn(
                'flex-1 p-2 rounded transition',
                isDirty && !isSubmitting
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;
};

export default EditProfileModal;
