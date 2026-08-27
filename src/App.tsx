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
        <div className="min-h-screen">
          <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          <div className="flex flex-col lg:ml-[280px]">
            <TopBar onMenuClick={() => setMobileNavOpen(true)} />
            <FilterBar />
            <main className="flex flex-col gap-6 px-4 pt-6 pb-4 sm:px-6 sm:pb-6">
              <Outlet />
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </FiltersProvider>
  )
}

export default App
