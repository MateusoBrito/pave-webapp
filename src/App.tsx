import { Outlet } from 'react-router-dom'
import { FilterBar } from './components/filters/FilterBar'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { FiltersProvider } from './context/FiltersContext'
import { PageHeaderProvider } from './context/PageHeaderContext'

function App() {
  return (
    <FiltersProvider>
      <PageHeaderProvider>
        <div className="grid min-h-screen grid-cols-[220px_1fr]">
          <Sidebar />
          <div className="flex flex-col">
            <TopBar />
            <FilterBar />
            <main className="flex flex-col gap-6 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </FiltersProvider>
  )
}

export default App
