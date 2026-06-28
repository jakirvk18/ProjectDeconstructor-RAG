import React from 'react'

const Footer = () => {
  return (
    <div className="text-center py-2  text-xs tracking-widest text-slate-500 font-sans">
      &copy; {new Date().getFullYear()} Designed and developed with ❤️ by <a href="https://github.com/jakirvk18" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
        Jakir Hussain
      </a>
    </div>
  )
}

export default Footer
