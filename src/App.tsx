import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/home';
import Week3 from './pages/week-3';

const App = ({ title }: { title: string }) => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/week-3" element={<Week3 />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
