import * as React from "react"

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 1024

type DeviceType = 'mobile' | 'tablet' | 'desktop' | undefined

export function useMobile(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(undefined)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      if (width < MOBILE_BREAKPOINT) {
        setDevice('mobile')
      } else if (width < TABLET_BREAKPOINT) {
        setDevice('tablet')
      } else {
        setDevice('desktop')
      }
    }
    
    // Initial check
    checkDevice()

    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlTablet = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      checkDevice()
    }
    
    mqlMobile.addEventListener("change", onChange)
    mqlTablet.addEventListener("change", onChange)
    
    return () => {
      mqlMobile.removeEventListener("change", onChange)
      mqlTablet.removeEventListener("change", onChange)
    }
  }, [])

  return device
}
