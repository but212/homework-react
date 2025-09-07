const FormContainer = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className='max-w-md mx-auto mt-10 bg-white rounded-lg shadow-lg p-8'>
      <h1 className='text-xl font-bold mb-6 text-center'>{title}</h1>
      {children}
    </div>
  );
};

export default FormContainer;