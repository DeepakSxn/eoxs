import Image from "next/image"
import Link from "next/link"

export default function DemoXplorePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img src="light.webp" height={120} width={80} alt="EOXS Logo" />
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="#" className="text-black hover:text-green-600 font-medium">
              Home
            </Link>
            <Link href="#" className="text-black hover:text-green-600 font-medium">
              Resource
            </Link>
            <Link href="#" className="text-black hover:text-green-600 font-medium">
              Blog
            </Link>
            <Link href="#" className="text-black hover:text-green-600 font-medium">
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
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-8">About DemoXplore</h1>
            <div className="flex justify-center mb-12">
              <img src="Component 1m.png" alt="DemoXplore Logo" height={360} width={200} />
            </div>

          </div>
        </section>

        {/* What is DemoXplore Section */}
        <section className="py-16 bg-gray-50">
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
        <section className="py-16 bg-gray-50">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
              {/* Icon 1 */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-green-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h3 className="font-bold">User Management</h3>
              </div>

              {/* Icon 2 */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-green-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </div>
                <h3 className="font-bold">Real-time Analytics</h3>
              </div>

              {/* Icon 3 */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-green-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M7 7h.01"></path>
                    <path d="M11 7h.01"></path>
                    <path d="M15 7h.01"></path>
                    <path d="M7 11h.01"></path>
                    <path d="M11 11h.01"></path>
                    <path d="M15 11h.01"></path>
                    <path d="M7 15h.01"></path>
                    <path d="M11 15h.01"></path>
                    <path d="M15 15h.01"></path>
                  </svg>
                </div>
                <h3 className="font-bold">Data Visualization</h3>
              </div>

              {/* Icon 4 */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-green-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-500"
                  >
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <h3 className="font-bold">Workflow Builder</h3>
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-md flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                Explore More
              </button>
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
