import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../ui/dropdown-menu";

const Navigation = () => {
  return (
    // <nav>
    //   <div className="nav-links">
    //     <a href="#">Overview</a>
    //     <a href="#">Solutions</a>
    //     <a href="#">Resources</a>
    //   </div>
    //   <div className="logo">
    //     <a href="#">
    //       <img
    //         src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=64&h=64&fit=crop&crop=center"
    //         alt="Byewind Logo"
    //       />
    //       Byewind
    //     </a>
    //   </div>
    //   <div className="nav-buttons">
    //     <div className="btn primary">
    //       <a href="#">Live Demo</a>
    //       <a href="#">Get Started</a>
    //     </div>
    //     <div className="btn secondary"></div>
    //   </div>
    // </nav>
    <nav className="shadow-2xl fixed left-50 top-5 w-[80%] mx-auto px-5! rounded-xl border-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-[101] text-black">
      <div className=" flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/image2.png"
              alt="Grainlyy Logo"
              width={100}
              height={100}
              className="w-full h-full mt-1"
            />
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm font-medium hover:text-green-600 transition-colors"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium hover:text-green-600 transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="#stakeholders"
            className="text-sm font-medium hover:text-green-600 transition-colors"
          >
            Stakeholders
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium hover:text-green-600 transition-colors"
          >
            FAQ
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button
              variant="outline"
              className="hidden md:flex hover:cursor-pointer"
            >
              Log In
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="bg-green-600 px-5 py-1.5 rounded-sm text-white hover:bg-green-700 hover:cursor-pointer">
              Get Started
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Get started as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/signup/delivery" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  Delivery
                </DropdownMenuItem>
              </Link>
              <Link href="/signup/vendor" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  Vendor
                </DropdownMenuItem>
              </Link>
              <Link href="/signup/ngo" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  NGO
                </DropdownMenuItem>
              </Link>
              <Link href="/signup/consumer" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  Consumer
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
