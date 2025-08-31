import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/main.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root 컨테이너가 발견되지 않음');
}

createRoot(root).render(<App title='템플릿 페이지' />);
