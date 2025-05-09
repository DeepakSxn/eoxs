"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DemoXplorePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/light-LCH7O6uquhczWMEBrRTQ5DNpWFHYqu.webp"
              alt="EOXS Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="https://eoxs.com" className="text-black hover:text-green-600 font-medium">
              Home
            </Link>
            <Link href="https://eoxs.com/contact" className="text-black hover:text-green-600 font-medium">
              Contact
            </Link>
          </nav>
          <div className="md:hidden">
            <button className="text-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-menu"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 pt-6">
          <button
            className="flex items-center gap-2 text-sm px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 mb-6 shadow-sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
            <div className="flex justify-center items-center mb-8 gap-4">
             
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-x3hD3z2XAUzxIZD8rWGN8hjplBX0sp.png"
                alt="DemoXplore Logo"
                width={80}
                height={80}
                className="h-20 w-auto"
              />
            </div>
            <p className="text-xl max-w-3xl mx-auto text-gray-700">
              DemoXplore is an innovative platform designed by EOXS to offer steel industry professionals a seamless,
              self-service experience to explore EOXS's software features.
            </p>
          </div>
        </section>

        {/* What is DemoXplore Section */}
        <section className="py-16 bg-green-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">What is DemoXplore?</h2>
              <p className="text-lg mb-6">
                DemoXplore is an innovative platform designed by EOXS to offer steel industry professionals a seamless,
                self-service experience to explore EOXS's software features. We understand that the traditional live
                demo process can be time-consuming and sometimes not tailored to specific needs. That's why DemoXplore
                empowers users to discover features at their own pace, whenever it suits them.
              </p>
            </div>
          </div>
        </section>

        {/* Why DemoXplore Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Why was DemoXplore Created?</h2>
              <p className="text-lg mb-6">
                We created DemoXplore to solve a common challenge faced by prospects and businesses alike — the need for
                quick, personalized software demos without scheduling constraints. Steel industry professionals can now
                explore our solutions on their own terms, focusing on the features that matter most to their specific
                operations.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-green-100">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>

            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-2xl font-bold mb-4">Self-Service Exploration</h3>
                <p className="text-gray-700">
                  Navigate through our software features at your own pace, focusing on the capabilities that matter most
                  to your steel business operations.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h3 className="text-2xl font-bold mb-4">24/7 Availability</h3>
                <p className="text-gray-700">
                  Access demos anytime, anywhere, eliminating the need to schedule and wait for traditional live
                  demonstrations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Icons Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Platform Capabilities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* No Scheduling */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 border-2 border-green-600 rounded p-2 w-12 h-12 flex items-center justify-center">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><rect x='3' y='4' width='18' height='18' rx='2' strokeWidth='2' stroke='currentColor' fill='none'/><path d='M16 2v4M8 2v4M3 10h18'/></svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">No Scheduling</h3>
                    <p className="text-gray-700">Watch demos without booking a time</p>
                  </div>
                </div>
              </div>
              {/* AI Personalized */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 bg-green-600 rounded-full p-2 w-12 h-12 flex items-center justify-center">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path d='M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 8v4m4-4h4m-8 0H4' strokeWidth='2' stroke='white' fill='none'/></svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">AI Personalized</h3>
                    <p className="text-gray-700">Content tailored to your interests</p>
                  </div>
                </div>
              </div>
              {/* No Clutter */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 p-2">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-10 w-10 text-green-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path d='M3 6h18M3 12h18M3 18h18' strokeWidth='2' stroke='currentColor' fill='none'/></svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">No Clutter</h3>
                    <p className="text-gray-700">Focused demos without distractions</p>
                  </div>
                </div>
              </div>
              {/* 24/7 Availability */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-40">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-2">
                    <div className="text-green-600 border-2 border-green-600 rounded-full p-2 w-12 h-12 flex items-center justify-center">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'><circle cx='12' cy='12' r='10' strokeWidth='2' stroke='currentColor' fill='none'/><path d='M12 6v6l4 2' strokeWidth='2' stroke='currentColor' fill='none'/></svg>
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

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <div className="flex justify-center space-x-8 mb-4">
            <Link href="#" className="hover:text-green-600">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-green-600">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-green-600">
              Contact Us
            </Link>
          </div>
          <p>© {new Date().getFullYear()} EOXS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
