"use client"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, LayoutDashboard, Package, MessageSquare, HeartHandshake, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function DashboardLayout({ children }) {
  const pathname = usePathname()
  const [pageTitle, setPageTitle] = useState("Dashboard")

  useEffect(() => {
    // Set page title based on current path
    if (pathname === "/") {
      setPageTitle("Dashboard")
    } else if (pathname === "/ration") {
      setPageTitle("Ration Tracking")
    } else if (pathname === "/complaints") {
      setPageTitle("Complaint System")
    } else if (pathname === "/ngo-help") {
      setPageTitle("NGO Help")
    }
  }, [pathname])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="flex items-center px-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-semibold">UD</span>
              </div>
              <span className="font-semibold text-lg">UserDash</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Dashboard">
                  <a href="/">
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/ration"} tooltip="Ration Tracking">
                  <a href="/ration">
                    <Package className="h-5 w-5" />
                    <span>Ration Tracking</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/complaints"} tooltip="Complaint System">
                  <a href="/complaints">
                    <MessageSquare className="h-5 w-5" />
                    <span>Complaint System</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/ngo-help"} tooltip="NGO Help">
                  <a href="/ngo-help">
                    <HeartHandshake className="h-5 w-5" />
                    <span>NGO Help</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-gray-500">john@example.com</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="sr-only">Notifications</span>
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <motion.main
            className="flex-1 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </SidebarProvider>
  )
}
