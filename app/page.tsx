"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { Logo } from "./components/logo"
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react"


export default function Home() {
  
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8">
          <div className="mr-4">
            <Logo />
          </div>
          <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
            <Link href="https://eoxs.com/" className="text-sm font-medium hover:underline">
              Home
            </Link>
            <Link href="https://eoxs.com/about/" className="text-sm font-medium hover:underline">
              About
            </Link>
            <Link href="https://eoxs.com/contact/" className="text-sm font-medium hover:underline">
              Contact
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Demo Video Management & Analytics Tool
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Access customized software demo videos, track engagement, and get valuable insights.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href={'/login'}>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 transition-all"
                
                >
                  Get Started
                </Button>
                </Link>
                
              </div>
            </div>
          </div>
        </section>
      </main>

   
      {/* Footer */}
      <footer className="bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-4">
        <div className="container mx-auto px-2  ">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">About EOXS</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Revolutionizing video content management in the steel industry with cutting-edge technology.
              </p>
              <div className="flex space-x-4">
                <a href="https://facebook.com/eoxs" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                  <Facebook size={20} />
                </a>
                <a href="https://twitter.com/eoxs" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                  <Twitter size={20} />
                </a>
                <a href="https://linkedin.com/company/eoxs" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                  <Linkedin size={20} />
                </a>
                <a href="https://instagram.com/eoxs" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                  <Instagram size={20} />
                </a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Home</Link></li>
                <li><Link href="/about" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">About Us</Link></li>
                <li><Link href="/services" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Services</Link></li>
                <li><Link href="/features" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Features</Link></li>
                <li><Link href="/contact" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Contact</Link></li>
              </ul>
            </div>

            {/* Services Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Our Services</h4>
              <ul className="space-y-2">
                <li><Link href="/video-management" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Video Management</Link></li>
                <li><Link href="/content-sharing" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Content Sharing</Link></li>
                <li><Link href="/analytics" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Analytics</Link></li>
                <li><Link href="/integrations" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Integrations</Link></li>
                <li><Link href="/support" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">Support</Link></li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="space-y-4">
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Contact Us</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail size={20} className="text-neutral-500 dark:text-neutral-400" />
                  <a href="mailto:info@eoxs.com" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">info@eoxs.com</a>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone size={20} className="text-neutral-500 dark:text-neutral-400" />
                  <a href="tel:+1234567890" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">+1 (234) 567-890</a>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin size={20} className="text-neutral-500 dark:text-neutral-400 mt-1" />
                  <address className="text-neutral-600 dark:text-neutral-400 not-italic">
                    123 Tech Lane, 
                    Innovation Park, 
                    Silicon Valley, CA 94000
                  </address>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright and Legal Links */}
          <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2 md:mb-0">
              &copy; {new Date().getFullYear()} EOXS. All Rights Reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/privacy-policy" className="text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
     
    </div>
  )





}

