import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { RedirectIfAuthed } from './components/auth/RedirectIfAuthed'
import { RequireAuth } from './components/auth/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import { ComparisonPage } from './pages/ComparisonPage'
import { LoginPage } from './pages/LoginPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { OverviewPage } from './pages/OverviewPage'
import { PostsPage } from './pages/PostsPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TopicDrilldownPage } from './pages/TopicDrilldownPage'
import { TopicsPage } from './pages/TopicsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <App />
              </RequireAuth>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="topicos" element={<TopicsPage />} />
            <Route path="topicos/:topicId" element={<TopicDrilldownPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="comparativo" element={<ComparisonPage />} />
            <Route path="metodologia" element={<MethodologyPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
