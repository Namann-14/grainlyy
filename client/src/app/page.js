"use client";

import { motion } from "framer-motion";
import {
  Check,
  Database,
  Globe,
  Lock,
  MapPin,
  Shield,
  Truck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="fixed left-50 top-5 z-40 w-[80%] mx-auto px-5 rounded-xl border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className=" flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold">Grainlyy</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
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
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                className="hidden md:flex hover:cursor-pointer"
              >
                Log In
              </Button>
            </Link>
            {/* <Button className="bg-green-600 hover:bg-green-800">
              Get Started
            </Button> */}
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
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-green-900 text-white overflow-hidden py-24">
          {/* Background Video */}
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute min-w-full min-h-full object-cover opacity-30"
            >
              <source
                src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-network-of-lines-18957-large.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-green-900 bg-opacity-70"></div>
          </div>

          <div className=" relative z-10 flex flex-col items-center py-20 text-center">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Transforming Public Distribution with Blockchain
            </motion.h1>
            <motion.p
              className="mt-6 text-lg md:text-xl max-w-2xl text-green-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Making government ration delivery transparent, tamper-proof, and
              publicly verifiable through blockchain technology.
            </motion.p>
            <motion.div
              className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                size="lg"
                className="bg-white text-green-900 hover:bg-green-50"
              >
                Learn More
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-green-800"
              >
                Watch Demo
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-b">
          <div className="">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div
                variants={fadeIn}
                className="flex flex-col items-center"
              >
                <span className="text-4xl md:text-5xl font-bold text-green-600">
                  20K+
                </span>
                <span className="mt-2 text-muted-foreground">
                  Deliveries Tracked
                </span>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="flex flex-col items-center"
              >
                <span className="text-4xl md:text-5xl font-bold text-green-600">
                  98%
                </span>
                <span className="mt-2 text-muted-foreground">
                  Reduction in Fraud
                </span>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="flex flex-col items-center"
              >
                <span className="text-4xl md:text-5xl font-bold text-green-600">
                  85%
                </span>
                <span className="mt-2 text-muted-foreground">
                  Increased Transparency
                </span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Empowering Your Distribution Journey
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Our blockchain-based system ensures transparency and
                accountability at every step of the ration distribution process.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mx-12"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div variants={fadeIn}>
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="p-2 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <Lock className="text-green-600 h-6 w-6" />
                    </div>
                    <CardTitle>Immutable Records</CardTitle>
                    <CardDescription>
                      All transactions are permanently recorded on the
                      blockchain, preventing tampering.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Once recorded, delivery data cannot be altered, ensuring a
                      trustworthy system for all stakeholders.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="p-2 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <MapPin className="text-green-600 h-6 w-6" />
                    </div>
                    <CardTitle>GPS Verification</CardTitle>
                    <CardDescription>
                      Real-time location tracking ensures deliveries reach their
                      intended destinations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Our system verifies the exact location of deliveries,
                      preventing diversion of supplies.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="p-2 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <Users className="text-green-600 h-6 w-6" />
                    </div>
                    <CardTitle>Trust Scores</CardTitle>
                    <CardDescription>
                      Dealers receive trust scores based on their delivery
                      performance and compliance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Incentivize good behavior and identify potential issues
                      before they become problems.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-slate-50">
          <div className="">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Your Advantages of Adopting Grainlyy
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                See how our blockchain solution transforms the public
                distribution system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <Image
                  src="/placeholder.svg?height=400&width=400"
                  alt="Blockchain Distribution"
                  width={400}
                  height={400}
                  className="mx-auto rounded-lg"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="p-2 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="text-green-600 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        Complete Transparency
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        All stakeholders can view the entire supply chain in
                        real-time, from warehouse to end recipient.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="p-2 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="text-green-600 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        Fraud Prevention
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        Immutable blockchain records and GPS verification make
                        it impossible to falsify delivery data.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="p-2 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="text-green-600 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        Public Accountability
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        Citizens can verify that government resources are being
                        distributed fairly and efficiently.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <div className="p-2 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="text-green-600 h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        Data-Driven Decisions
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        Comprehensive analytics help optimize distribution
                        routes and identify areas for improvement.
                      </p>
                    </div>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stakeholders Section */}
        <section id="stakeholders" className="py-20">
          <div className="">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Everything Your Platform Needs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Tailored dashboards for every stakeholder in the distribution
                system.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div variants={fadeIn}>
                <Card className="h-full bg-green-50 border-green-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      Government
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Complete oversight of distribution network</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Performance analytics and reporting</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Dealer trust score monitoring</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full bg-purple-50 border-purple-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      Dealers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-purple-600" />
                        <span>Simplified inventory management</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-purple-600" />
                        <span>Transparent delivery verification</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-purple-600" />
                        <span>Trust score improvement opportunities</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full bg-blue-50 border-blue-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Public
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-blue-600" />
                        <span>Real-time delivery tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-blue-600" />
                        <span>Verification of ration quality and quantity</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-blue-600" />
                        <span>Feedback and reporting system</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full bg-amber-50 border-amber-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-600" />
                      NGOs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>Independent verification capabilities</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>
                          Data for advocacy and policy recommendations
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>
                          Integration with existing monitoring systems
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-20 bg-slate-50">
          <div className="">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Showcasing Remarkable Success Stories
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                See how Grainlyy is transforming public distribution systems
                across regions.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.div variants={fadeIn}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden">
                        <Image
                          src="/placeholder.svg?height=80&width=80"
                          alt="District Officer"
                          width={80}
                          height={80}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <CardTitle className="text-center">
                      District Officer
                    </CardTitle>
                    <CardDescription className="text-center">
                      Eastern Region
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      "Grainlyy has transformed our distribution system. We've
                      seen a 95% reduction in complaints and complete
                      transparency in our operations."
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden">
                        <Image
                          src="/placeholder.svg?height=80&width=80"
                          alt="Ration Shop Owner"
                          width={80}
                          height={80}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <CardTitle className="text-center">
                      Ration Shop Owner
                    </CardTitle>
                    <CardDescription className="text-center">
                      Western District
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      "The trust score system has helped me improve my service.
                      My customers now have complete faith in my shop's
                      operations."
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeIn}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex justify-center mb-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden">
                        <Image
                          src="/placeholder.svg?height=80&width=80"
                          alt="NGO Director"
                          width={80}
                          height={80}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    <CardTitle className="text-center">NGO Director</CardTitle>
                    <CardDescription className="text-center">
                      Food Security Alliance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground">
                      "Grainlyy provides the data we need to ensure food
                      security. The transparency has been revolutionary for our
                      monitoring efforts."
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20">
          <div className="">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about Grainlyy's blockchain
                distribution system.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    How does blockchain ensure transparency?
                  </AccordionTrigger>
                  <AccordionContent>
                    Blockchain creates an immutable, tamper-proof record of all
                    transactions. Every delivery is recorded on the blockchain
                    with timestamps, locations, and quantities, creating a
                    permanent and publicly verifiable record that cannot be
                    altered.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    What hardware is required for implementation?
                  </AccordionTrigger>
                  <AccordionContent>
                    The system requires minimal hardware - just smartphones for
                    dealers and distribution centers to record deliveries and
                    verify GPS locations. Government offices and NGOs can access
                    the system through any internet-connected device.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    How are trust scores calculated?
                  </AccordionTrigger>
                  <AccordionContent>
                    Trust scores are calculated based on multiple factors
                    including delivery accuracy, timeliness, customer feedback,
                    and compliance with GPS verification. The algorithm is
                    transparent and dealers can see exactly how their actions
                    affect their score.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    Can the system work offline?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, the mobile application has offline capabilities that
                    store transaction data locally until connectivity is
                    restored. Once back online, the data is synchronized with
                    the blockchain to maintain the integrity of the record.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    How is user privacy protected?
                  </AccordionTrigger>
                  <AccordionContent>
                    While the system ensures transparency of the distribution
                    process, personal data of recipients is protected through
                    encryption and access controls. The public can verify that
                    deliveries occurred without accessing sensitive personal
                    information.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-green-900 text-white">
          <div className="">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Transform Your Distribution System?
              </h2>
              <p className="mt-6 text-lg text-green-50 max-w-2xl mx-auto">
                Join the growing network of governments and organizations using
                Grainlyy to ensure transparent and efficient public distribution.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-green-600 hover:bg-green-50"
                >
                  Request Demo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-green-800"
                >
                  Contact Sales
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-6 w-6 text-green-600" />
                <span className="text-xl font-bold">Grainlyy</span>
              </div>
              <p className="text-muted-foreground max-w-xs">
                Making government ration delivery transparent, tamper-proof, and
                publicly verifiable through blockchain technology.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    API
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Grainlyy. All rights reserved.
              Blockchain-powered transparency for public distribution.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-green-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-green-600 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-green-600 transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
