"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Brain, BrushIcon as Broom } from "lucide-react"
import { useEffect, useState } from "react"

export default function Home() {
  // Add state to control visibility
  const [isLoaded, setIsLoaded] = useState(false)

  // Set loaded state after component mounts
  useEffect(() => {
    setTimeout(() => {
      setIsLoaded(true);
    }, 0); // Set timeout to 0 for immediate effect
  }, []);
  

  return (
    <div className="flex flex-col min-h-screen bg-white">
     <header className="bg-transparent">
        <div className="container flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              
              <img src="light.webp" height={180} width={80}/>
            </Link>
          </div>
          <nav className="ml-auto flex gap-8 items-center">
            <Link href="https://eoxs.com/" className="text-base font-medium">
              Home
            </Link>
            <Link href="/about" className="text-base font-medium">
              About
            </Link>
            <Link href="https://eoxs.com/contact" className="text-base font-medium">
              Contact
            </Link>
          </nav>
        </div>
      </header>


      <main className="flex-1">
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              {/* Apply visibility class based on loaded state */}
              <h1
                className={`text-5xl md:text-6xl font-bold tracking-tighter ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
              >
              <img src="Component 1m.png" alt="Demox" height={360} width={200}/>
                
              </h1>
              <p className="text-xl md:text-2xl max-w-3xl">Explore our software features at your own pace.</p>
              <div className="pt-4">
              <Link href={'login'}>
              <Button size="lg" className="bg-green-600 hover:bg-green-500 text-white px-12 py-6 text-lg rounded-md">
                  Get Started
                </Button>
              </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12">
          <div className="container px-4 md:px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 border-2 border-green-600 rounded p-2 w-12 h-12 flex items-center justify-center">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">No Scheduling</h3>
                    <p className="text-gray-700">Watch demos without booking a time</p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 bg-green-600 rounded-full p-2 w-12 h-12 flex items-center justify-center">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">AI Personalized</h3>
                    <p className="text-gray-700">Content tailored to your interests</p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 p-2">
                      <Broom className="h-10 w-10 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">No Clutter</h3>
                    <p className="text-gray-700">Focused demos without distractions</p>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 border-2 border-green-600 rounded-full p-2 w-12 h-12 flex items-center justify-center">
                      <Clock className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">24/7 Availability</h3>
                    <p className="text-gray-700">Access demos anytime, day or night</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-6">
        <div className="container px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-4">
            
              Privacy Policy
            
           
              Certified Engineer
           
          </div>
        </div>
      </footer>
    </div>
  )
}
