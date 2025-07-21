"use client"

import { useState, useEffect } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { Check, Building } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

interface Company {
  id: string
  name: string
}

interface CompanyFilterAdminProps {
  onFilterChange: (companyName: string | null) => void
  selectedCompany: string | null
}

export function CompanyFilterAdmin({ onFilterChange, selectedCompany }: CompanyFilterAdminProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true)
        
        // Query for users with unique company names
        const usersCollection = collection(db, "users")
        const usersSnapshot = await getDocs(usersCollection)
        
        if (!usersSnapshot.empty) {
          // Extract unique company names from users
          const companySet = new Set<string>();
          usersSnapshot.docs.forEach(doc => {
            const companyName = doc.data().companyName;
            if (companyName && typeof companyName === 'string') {
              companySet.add(companyName.trim());
            }
          });
          
          // Normalize company names - capitalize all eoxs references
          const companiesList = Array.from(companySet).map(name => {
            // Special case for eoxs to make it uppercase
            const displayName = name.toLowerCase() === 'eoxs' ? 'EOXS' : name;
            return {
              id: name.toLowerCase().replace(/\s+/g, '_'),
              name: displayName
            };
          });
          
          // Sort alphabetically
          companiesList.sort((a, b) => a.name.localeCompare(b.name));
          
          // Remove duplicates that might differ only in case
          const normalizedCompanies: Record<string, Company> = {};
          companiesList.forEach(company => {
            const normalized = company.name.toLowerCase();
            if (!normalizedCompanies[normalized] || company.name.length > normalizedCompanies[normalized].name.length) {
              normalizedCompanies[normalized] = company;
            }
          });

          setCompanies([
            { id: "all", name: "All Companies" },
            ...Object.values(normalizedCompanies)
          ]);
        } else {
          // Default if no companies exist
          setCompanies([
            { id: "all", name: "All Companies" },
            { id: "eoxs", name: "EOXS" }
          ]);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
        // Set default companies on error
        setCompanies([
          { id: "all", name: "All Companies" },
          { id: "eoxs", name: "EOXS" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="relative">
      <Select 
        value={selectedCompany || "all"}
        onValueChange={(value) => onFilterChange(value === "all" ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px] focus:ring-primary">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <SelectValue placeholder="All Companies" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 