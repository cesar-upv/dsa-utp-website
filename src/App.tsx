import { BookOpen, CalendarCheck2, Files, Users2 } from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DataPage from '@/pages/DataPage'
import DataManagerPage from '@/pages/DataManagerPage'
import GeneratorPage from '@/pages/GeneratorPage'
import ProfessorsPage from '@/pages/ProfessorsPage'

const navItems = [
  { label: 'Datos base', href: '/', icon: BookOpen },
  { label: 'Profesores', href: '/profesores', icon: Users2 },
  { label: 'Generador', href: '/generador', icon: CalendarCheck2 },
  { label: 'Gestor', href: '/gestor', icon: Files },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/80 backdrop-blur">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
              UTP
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Ingeniería en TI
              </p>
              <p className="text-lg font-semibold">UTP Timetabling</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const active =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={active ? 'default' : 'ghost'}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">JSON in/out</Badge>
            <Badge variant="outline">Local</Badge>
          </div>
        </div>
      </header>
      <main className="container py-8">
        <Routes>
          <Route path="/" element={<DataPage />} />
          <Route path="/profesores" element={<ProfessorsPage />} />
          <Route path="/generador" element={<GeneratorPage />} />
          <Route path="/gestor" element={<DataManagerPage />} />
          <Route path="*" element={<DataPage />} />
        </Routes>
      </main>
    </div>
  )
}
