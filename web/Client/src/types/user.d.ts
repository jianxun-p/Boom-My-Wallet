
export interface User {
    loaded?: boolean
    uid: string
    token: string
    google?: {
        accessToken: string
    }
}

export interface GeoCoordinates {
    longitude: number
    latitude: number
    altitude?: number
}

export interface Transaction {
    row: number
    time: Date
    category: string
    amount: string
    currency: string
    name: string
    merchant: string
    paymentMethod: string
    location: string
    position: GeoCoordinates
    description: string
    imageUrl?: string
}
