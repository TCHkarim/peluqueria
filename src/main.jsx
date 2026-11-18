import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import App from './App.jsx';import Admin from './Admin.jsx';import './styles.css';
function R(){const [h,setH]=useState(location.hash);useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);
return h.startsWith('#/admin')?<Admin/>:<App/>}
createRoot(document.getElementById('root')).render(<R/>);
