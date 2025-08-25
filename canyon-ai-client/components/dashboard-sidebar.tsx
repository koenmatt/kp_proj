"use client"

import { usePathname } from 'next/navigation'
import { AppSidebar } from './app-sidebar'
import type { ComponentProps } from 'react'

type DashboardSidebarProps = ComponentProps<typeof AppSidebar>

export function DashboardSidebar(props: DashboardSidebarProps) {
  const pathname = usePathname()
  
  return <AppSidebar {...props} currentPath={pathname} />
} 