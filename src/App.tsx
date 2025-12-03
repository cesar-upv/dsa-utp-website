import { BookOpen, CalendarCheck2, Files, Users2, AlertTriangle } from 'lucide-react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import DataPage from '@/pages/DataPage'
import DataManagerPage from '@/pages/DataManagerPage'
import GeneratorPage from '@/pages/GeneratorPage'
import ProfessorsPage from '@/pages/ProfessorsPage'
import { useTimetableStore } from '@/store/useTimetableStore'

const navItems = [
  { label: 'Datos base', href: '/', icon: BookOpen },
  { label: 'Profesores', href: '/profesores', icon: Users2 },
  { label: 'Generador', href: '/generador', icon: CalendarCheck2 },
  { label: 'Gestor', href: '/gestor', icon: Files },
]

export default function App() {
  const location = useLocation()
  const ultimaEjecucion = useTimetableStore((state) => state.ultimaEjecucion)
  const [warningsOpen, setWarningsOpen] = useState(false)

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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setWarningsOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 text-warning" />
              Advertencias
            </Button>
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
      {warningsOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0">
              <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-white shadow-ambient p-6 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-primary">
                      Advertencias
                    </p>
                    <p className="text-lg font-semibold">
                      Última generación de horarios
                    </p>
                    {ultimaEjecucion ? (
                      <p className="text-xs text-muted-foreground">
                        Estado: {ultimaEjecucion.status} · {ultimaEjecucion.tiempoMs} ms
                      </p>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setWarningsOpen(false)}>
                    Cerrar
                  </Button>
                </div>
                {ultimaEjecucion?.warnings?.length ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {ultimaEjecucion.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay advertencias registradas aún.
                  </p>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
