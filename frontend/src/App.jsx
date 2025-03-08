import Layout from "./Layout";
import { Outlet } from 'react-router-dom';
import './App.css';
import './../fonts/CormorantInfant-Light.woff2';
import './../fonts/CormorantInfant-LightItalic.woff2';

const App = () => {
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  };
  
export default App;