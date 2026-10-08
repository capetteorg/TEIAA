import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/authContext'
// Ícones e fonte hospedados dentro do app (antes vinham de CDN — se a internet
// caísse, a tela abria sem ícone nenhum, parecendo quebrada no celular da equipe).
import '@tabler/icons-webfont/tabler-icons.min.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
