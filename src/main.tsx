import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ComparisonPage } from './pages/ComparisonPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { OverviewPage } from './pages/OverviewPage'
import { PostsPage } from './pages/PostsPage'
import { TopicDrilldownPage } from './pages/TopicDrilldownPage'
import { TopicsPage } from './pages/TopicsPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<OverviewPage />} />
          <Route path="topicos" element={<TopicsPage />} />
          <Route path="topicos/:topicId" element={<TopicDrilldownPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="comparativo" element={<ComparisonPage />} />
          <Route path="metodologia" element={<MethodologyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
