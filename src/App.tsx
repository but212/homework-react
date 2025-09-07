import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Home from './pages/home';
import Week3 from './pages/week-3';
import Week4 from './pages/week-4';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/week-3' element={<Week3 />} />
        <Route path='/week-4/*' element={<Week4 />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
};

export default App;
