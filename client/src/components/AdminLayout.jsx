// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { useMetaMask } from '@/components/MetaMaskProvider';
// import Layout from './Layout';

// export default function AdminLayout({ children }) {
//   const { connected } = useMetaMask();
//   const router = useRouter();

//   useEffect(() => {
//     if (!connected) {
//       router.push('/');
//     }
//   }, [connected, router]);

//   return (
//     <Layout>
//       <div className="flex min-h-screen">
//         <aside className="w-64 bg-gray-800 text-white">
//           <div className="p-4">
//             <h2 className="text-xl font-bold">Admin Panel</h2>
//           </div>
//           <nav className="mt-6">
//             <a href="/admin" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
//               Dashboard
//             </a>
//             <a href="/admin/assign" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
//               Assign Delivery
//             </a>
//             <a href="/admin/users" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
//               Manage Users
//             </a>
//             <a href="/admin/depots" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
//               Manage Depots
//             </a>
//             <a href="/admin/delivery-persons" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">
//               Delivery Persons
//             </a>
//           </nav>
//         </aside>

//         <div className="flex-1">
//           {children}
//         </div>
//       </div>
//     </Layout>
//   );
// }

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

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { connected } = useMetaMask();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/20">
        <Sidebar variant="inset" className="border-r border-green-100">
          <SidebarHeader className="border-b border-green-100">
            <Link href="/">
              <div className="flex items-center gap-2 px-4 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white">
                  <Package className="h-4 w-4" />
                </div>
                <div className="font-semibold text-green-900">Grainlyyy</div>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/dashboard"}
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard className="h-4 w-4 text-green-700" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/users"}>
                      <Link href="/users">
                        <Users className="h-4 w-4 text-green-700" />
                        <span>Users</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/depots"}
                    >
                      <Link href="/depots">
                        <Home className="h-4 w-4 text-green-700" />
                        <span>Depots</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/deliveries"}
                    >
                      <Link href="/deliveries">
                        <ShoppingCart className="h-4 w-4 text-green-700" />
                        <span>Deliveries</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/analytics"}
                    >
                      <Link href="/analytics">
                        <BarChart3 className="h-4 w-4 text-green-700" />
                        <span>Analytics</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === "/settings"}
                    >
                      <Link href="/settings">
                        <Settings className="h-4 w-4 text-green-700" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                  <DropdownMenuItem>
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
              <Button
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700"
              >
                <span className="sr-only sm:not-sr-only sm:ml-2">Help</span>
              </Button>
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
                  <DropdownMenuItem>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
