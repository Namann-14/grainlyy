"use client";

import React from "react";
import {
  BarChart3,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Users,
  LayoutDashboardIcon,
  Truck,
  HelpingHandIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/components/MetaMaskProvider";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";

const navLinks = {
  mainMenu: [
    {
      href: "/admin",
      icon: LayoutDashboardIcon,
      label: "Dashboard",
      iconColor: "text-green-700"
    },
    {
      href: "/admin/users",
      icon: Users,
      label: "Users",
      iconColor: "text-green-700"
    },
    {
      href: "/admin/consumer-requests",
      icon: Package,
      label: "Consumer Requests",
      iconColor: "text-green-700"
    },
    {
      href: "/admin/consumers",
      icon: Users,
      label: "Consumer Management",
      iconColor: "text-purple-700"
    },
    {
      href: "/admin/support",
      icon: HelpingHandIcon,
      label: "Consumer Complaints",
      iconColor: "text-yellow-700"
    },
    {
      href: "/admin/register-shopkeeper",
      icon: Users,
      label: "Register Shopkeeper",
      iconColor: "text-blue-700"
    },
    {
      href: "/admin/pickup-management",
      icon: Truck,
      label: "Pickup Management",
      iconColor: "text-green-700"
    },
    {
      href: "/admin/debug-shopkeepers",
      icon: Settings,
      label: "Debug Shopkeepers",
      iconColor: "text-red-700"
    },
    {
      href: "/admin/test-data",
      icon: Settings,
      label: "Test Data",
      iconColor: "text-green-700"
    },
    {
      href: "/admin/deliveries",
      icon: ShoppingCart,
      label: "Deliveries",
      iconColor: "text-green-700"
    }
  ],
  system: [
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
      iconColor: "text-green-700"
    }
  ]
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { connected, account } = useMetaMask();
  const router = useRouter();

  useEffect(() => {
    // Give some time for MetaMask to connect, then check authentication
    const checkAuth = async () => {
      // Check if user data exists in localStorage first
      const currentUser = localStorage.getItem('currentUser');
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          if (userData.type === 'admin') {
            return; // User is authenticated as admin, stay on page
          }
        } catch (error) {
          console.log('Error parsing user data:', error);
        }
      }

      // If no wallet connection and no stored admin data, redirect to login
      if (!connected && !currentUser) {
        router.push("/login");
        return;
      }

      // If wallet is connected but not the admin wallet, redirect to login
      if (connected && account) {
        const ADMIN_ADDRESS = "0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa".toLowerCase();
        if (account.toLowerCase() !== ADMIN_ADDRESS) {
          router.push("/login");
          return;
        }
      }
    };

    // Add a small delay to allow MetaMask to initialize
    const timeoutId = setTimeout(checkAuth, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [connected, account, router]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar variant="inset" className="border-r border-green-100">
          <SidebarHeader className="border-b border-green-100">
            <Link href="/">
              <div className="flex items-center gap-2 px-4 py-1">
                <Image
                  src="/image2.png"
                  alt="Logo"
                  width={100}
                  height={100}
                  className="h-8 rounded-md w-[80%] mx-auto"
                />
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navLinks.mainMenu.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton asChild isActive={pathname === link.href}>
                          <Link href={link.href}>
                            <IconComponent className={`h-4 w-4 ${link.iconColor}`} />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navLinks.system.map((link) => {
                    const IconComponent = link.icon;
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton asChild isActive={pathname === link.href}>
                          <Link href={link.href}>
                            <IconComponent className={`h-4 w-4 ${link.iconColor}`} />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-green-100">
            <div className="">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                      <AvatarFallback className="bg-green-100 text-green-800">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">Admin User</span>
                      <span className="text-xs text-muted-foreground">
                        admin@example.com
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-green-100 bg-white px-6">
            <SidebarTrigger />
            <div className="w-full md:w-auto md:flex-1">
              <form>
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full rounded-md border-green-200 pl-8 md:w-[300px]"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-green-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </form>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                      <AvatarFallback className="bg-green-100 text-green-800">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
