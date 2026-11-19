import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

/** Black crackle enamel of the body. */
export const enamel = new MeshPhysicalMaterial({
  color: new Color('#15171b'),
  roughness: 0.34,
  metalness: 0.15,
  clearcoat: 0.7,
  clearcoatRoughness: 0.22,
})

export const chrome = new MeshStandardMaterial({ color: '#dde1e6', metalness: 1, roughness: 0.16 })
export const nickel = new MeshStandardMaterial({ color: '#9a9ea5', metalness: 1, roughness: 0.34 })
export const brass = new MeshStandardMaterial({ color: '#b7923f', metalness: 0.9, roughness: 0.34 })
export const rubber = new MeshStandardMaterial({ color: '#101011', roughness: 0.86, metalness: 0 })
export const cream = new MeshStandardMaterial({ color: '#e7ddc4', roughness: 0.5, metalness: 0 })

export const ribbonBlack = new MeshStandardMaterial({ color: '#0c0b0a', roughness: 0.92, side: DoubleSide })
export const ribbonRed = new MeshStandardMaterial({ color: '#8d1913', roughness: 0.92, side: DoubleSide })

export const lampMetal = new MeshStandardMaterial({ color: '#1f3a2f', roughness: 0.4, metalness: 0.6, side: DoubleSide })
export const lampInside = new MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.6, metalness: 0.2, side: DoubleSide })
