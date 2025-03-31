import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import HomeComponent from "@/components/home/home.component";

describe('Home', () => {
    it('renders a heading', () => {
      render(<HomeComponent/>)
   
      const heading = screen.getByRole('heading', { level: 1 })
   
      expect(heading).toBeInTheDocument()
    })
  })