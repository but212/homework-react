import '@/styles/main.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
    return (
        <>
            <h1>3주차 과제</h1>
            <p>검색 리스트 만들기</p>
        </>
    )
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root 컨테이너가 발견되지 않음');
}

createRoot(root).render(<StrictMode><App /></StrictMode>);