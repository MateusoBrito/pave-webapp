import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ScrollToTop } from './components/layout/ScrollToTop'
import { AuthProvider } from './context/AuthContext'
import { AdTopicDrilldownPage } from './pages/AdTopicDrilldownPage'
import { ComparisonPage } from './pages/ComparisonPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { OverviewPage } from './pages/OverviewPage'
import { PostsPage } from './pages/PostsPage'
import { TopicDrilldownPage } from './pages/TopicDrilldownPage'
import { TopicsPage } from './pages/TopicsPage'
import { AboutPage } from './pages/AboutPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ScrollToTop />
        <Routes>

          <Route
            path="/"
            element={
              <App />
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="topicos" element={<TopicsPage />} />
            <Route path="topicos/:topicId" element={<TopicDrilldownPage />} />
            <Route path="posts" element={<PostsPage />} />
            <Route path="anuncios/:topicId" element={<AdTopicDrilldownPage />} />
            <Route path="comparativo" element={<ComparisonPage />} />
            <Route path="sobre" element={<AboutPage />} />
            <Route path="metodologia" element={<MethodologyPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
