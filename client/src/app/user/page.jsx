"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowUpRight, Users, Package, MessageSquare, HeartHandshake } from "lucide-react"

const data = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
  { name: "May", value: 500 },
  { name: "Jun", value: 900 },
]

const statsData = [
  {
    title: "Total Users",
    value: "1,234",
    change: "+12.3%",
    icon: Users,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Rations Distributed",
    value: "5,678",
    change: "+8.2%",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Active Complaints",
    value: "42",
    change: "-3.1%",
    icon: MessageSquare,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "NGO Partnerships",
    value: "15",
    change: "+2",
    icon: HeartHandshake,
    color: "bg-purple-100 text-purple-600",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {statsData.map((stat, index) => (
          <motion.div key={index} variants={item}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                    <div className="flex items-center mt-1 text-sm">
                      <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                      <span className="text-emerald-500">{stat.change}</span>
                      <span className="text-gray-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`${stat.color} p-3 rounded-full`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle>Ration Distribution Overview</CardTitle>
            <CardDescription>Monthly distribution statistics for the current year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Complaints</CardTitle>
              <CardDescription>Latest complaints submitted by users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0">
                    <div
                      className={`w-2 h-2 mt-2 rounded-full ${i === 0 ? "bg-red-500" : i === 1 ? "bg-amber-500" : "bg-emerald-500"}`}
                    ></div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {i === 0 ? "Missing Ration Items" : i === 1 ? "Quality Issues" : "Delayed Distribution"}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {i === 0
                          ? "Rice and oil were missing from my monthly package"
                          : i === 1
                            ? "The quality of wheat flour was below standard"
                            : "Distribution was delayed by 3 days without notice"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {i === 0 ? "2 hours ago" : i === 1 ? "1 day ago" : "3 days ago"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Distributions</CardTitle>
              <CardDescription>Schedule for upcoming ration distributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-start space-x-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="min-w-[60px] text-center">
                      <p className="text-sm font-bold text-emerald-600">
                        {i === 0 ? "May 15" : i === 1 ? "May 22" : "Jun 01"}
                      </p>
                      <p className="text-xs text-gray-500">{i === 0 ? "Mon" : i === 1 ? "Mon" : "Thu"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">
                        {i === 0 ? "Regular Monthly Package" : i === 1 ? "Special Supplies" : "Quarterly Distribution"}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {i === 0
                          ? "Rice, wheat, oil, and pulses"
                          : i === 1
                            ? "Medical supplies and hygiene products"
                            : "Extended package with additional items"}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {i === 0 ? "Zone A - Center 1" : i === 1 ? "Zone B - Center 3" : "All Zones"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
