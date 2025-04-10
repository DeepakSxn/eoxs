"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { Logo } from "./components/logo"
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react"

export default function Home() {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/banner-1.jpg"
          alt="Warehouse Background"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content wrapper with higher z-index */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="bg-transparent">
          <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8">
            <div className="mr-4 pt-2">
              <img src="/dark.webp" height={100} width={100}   />
            </div>
            <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
              <Link href="https://eoxs.com/" className="text-sm font-medium hover:underline text-white">Home</Link>
              <Link href="https://eoxs.com/about/" className="text-sm font-medium hover:underline text-white">About</Link>
              <Link href="https://eoxs.com/contact/" className="text-sm font-medium hover:underline text-white">Contact</Link>
              <div className="hidden">
                
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center pt-14 justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h6 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl text-white drop-shadow-md">
                  VIEWLOX
                  </h6>
                  <p className="mx-auto max-w-[700px] text-white md:text-xl">

                     Where steel engineering meets powerful demonstration
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Link href="/login">
                  <Button size="lg" className="bg-gray-500 hover:bg-gray-600 transition-all">
                  Get Started
                  </Button>

                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-transparent py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              {/* Certified Engineers Section - Left Side */}
              <div className="md:w-1/3">
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-white">Certified Engineers</h1>
                  <p className="text-white/80 font-medium mt-2">DMCAPROTECTED</p>
                </div>
                
                <div className="text-xs text-white/70 mb-6">
                  © {new Date().getFullYear()} www.exos.com. All rights reserved.
                </div>
                
                <div className="flex space-x-4">
                  <a href="https://facebook.com/eoxs" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                    <Facebook size={20} />
                  </a>
                  <a href="https://twitter.com/eox" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                    <Twitter size={20} />
                  </a>
                  <a href="https://linkedin.com/company/eoxs" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                    <Linkedin size={20} />
                  </a>
                  <a href="https://instagram.com/eoxs" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
                    <Instagram size={20} />
                  </a>
                </div>
              </div>

              {/* Statutory Legal Information - Right Side */}
              <div className="md:w-2/3">
                <h2 className="text-base font-semibold text-white mb-3">Statutory Legal Information</h2>
                <div className="text-sm text-white/80 space-y-3">
                  <p>
                    EOXS is the Registered Name of Prato Inc., an IT company situated in Santa Monica, California, USA at the address - 202 Bicknell Ave, Santa Monica, CA 90405, United States.
                  </p>
                  <p>
                    All the personal information that you submit on the website - (Name, Email, Phone and Project Details) will not be sold, shared or rented to others. Our sales team or the team of software developers only use this information to send updates about our company and projects or contact you if requested or find it necessary.
                  </p>
                  <p>
                    You may opt out of receiving our communication by dropping us an email at - {' '}
                    <a href="mailto:rajat@exxs.com" className="text-blue-300 hover:underline">rajat@exxs.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
