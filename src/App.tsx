import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { FilterBar } from './components/filters/FilterBar'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { FiltersProvider } from './context/FiltersContext'
import { PageHeaderProvider } from './context/PageHeaderContext'

function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <FiltersProvider>
      <PageHeaderProvider>
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
          <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          <div className="flex flex-col">
            <TopBar onMenuClick={() => setMobileNavOpen(true)} />
            <FilterBar />
            <main className="flex flex-col gap-6 p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </FiltersProvider>
  )
}

export default App
