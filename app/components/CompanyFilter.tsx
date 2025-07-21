"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

interface Company {
  id: string
  name: string
}

interface CompanyFilterProps {
  onFilterChange: (companyId: string | null) => void
  selectedCompany: string | null
}

export function CompanyFilter({ onFilterChange, selectedCompany }: CompanyFilterProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        const companiesCollection = collection(db, "companies")
        const companiesSnapshot = await getDocs(companiesCollection)
        
        if (!companiesSnapshot.empty) {
          const companiesList = companiesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id
          }))
          setCompanies(companiesList)
        } else {
          // If no companies exist in the database, create a default list
          setCompanies([
            { id: "all", name: "All Companies" },
            { id: "eoxs", name: "EOXS" },
            { id: "acme", name: "Acme Corp" },
            { id: "steel_inc", name: "Steel Inc." },
            { id: "metal_works", name: "Metal Works" }
          ])
        }
      } catch (error) {
        console.error("Error fetching companies:", error)
        // Set default companies on error
        setCompanies([
          { id: "all", name: "All Companies" },
          { id: "eoxs", name: "EOXS" },
          { id: "acme", name: "Acme Corp" }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [])

  const getSelectedCompanyName = () => {
    if (!selectedCompany) return "All Companies"
    const company = companies.find(c => c.id === selectedCompany)
    return company ? company.name : "All Companies"
  }

  return (
    <div className="px-2 py-1">
      <h3 className="text-sm font-medium mb-2 text-white/90">Filter by Company</h3>
      {loading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="w-full justify-between">
              <span className="truncate">{getSelectedCompanyName()}</span>
              <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" sideOffset={5}>
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => onFilterChange(null)}
                className="flex justify-between"
              >
                <span>All Companies</span>
                {!selectedCompany && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
              
              {companies.filter(c => c.id !== "all").map((company) => (
                <DropdownMenuItem 
                  key={company.id} 
                  onClick={() => onFilterChange(company.id)}
                  className="flex justify-between"
                >
                  <span>{company.name}</span>
                  {selectedCompany === company.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
} 