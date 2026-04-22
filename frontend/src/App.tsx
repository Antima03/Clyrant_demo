import { FiltersProvider } from '@/context/FiltersContext'
import { ViewProvider } from '@/context/ViewContext'
import { LandingView } from '@/pages/LandingView'

export default function App() {
  return (
    <FiltersProvider>
      <ViewProvider>
        <LandingView />
      </ViewProvider>
    </FiltersProvider>
  )
}
