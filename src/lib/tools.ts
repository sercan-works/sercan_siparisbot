export const CHECK_AVAILABILITY_TOOL = {
    type: "function",
    function: {
        name: "check_availability",
        description: "Check room availability for a given date range and number of guests. Use this whenever a customer asks about room availability, prices, or vacancy. Always ask for check-in and check-out dates if not provided.",
        parameters: {
            type: "object",
            properties: {
                checkIn: {
                    type: "string",
                    description: "Check-in date in YYYY-MM-DD format. If user says 'tomorrow', calculate the date based on current date."
                },
                checkOut: {
                    type: "string",
                    description: "Check-out date in YYYY-MM-DD format."
                },
                guests: {
                    type: "number",
                    description: "Number of guests (adults + children). Default to 2 if not specified."
                },
                roomType: {
                    type: "string",
                    description: "Optional specific room type name (e.g. 'Deluxe', 'Suite')."
                }
            },
            required: ["checkIn", "checkOut", "guests"]
        }
    }
}

export const CREATE_RESERVATION_TOOL = {
    type: "function",
    function: {
        name: "create_reservation",
        description: "Create a new hotel reservation. CRITICAL: You MUST have checked availability first. You MUST have verbally confirmed all details (dates, room, name) with the user and received a clear 'YES' before using this tool. IMPORTANT: If you mentioned price information to the guest (e.g., 'gecelik 1000 TL, toplam 3000 TL'), you MUST include totalPrice parameter with the total amount.",
        parameters: {
            type: "object",
            properties: {
                checkIn: {
                    type: "string",
                    description: "Check-in date in YYYY-MM-DD format."
                },
                checkOut: {
                    type: "string",
                    description: "Check-out date in YYYY-MM-DD format."
                },
                guests: {
                    type: "number",
                    description: "Number of guests."
                },
                roomType: {
                    type: "string",
                    description: "Room type name to book (e.g. 'Standard', 'Deluxe')."
                },
                guestName: {
                    type: "string",
                    description: "Full name of the guest."
                },
                guestPhone: {
                    type: "string",
                    description: "Contact phone number of the guest. If not provided, the system will attempt to use the caller's phone number."
                },
                specialRequests: {
                    type: "string",
                    description: "Any special requests (e.g. 'Late check-in', 'High floor'). Optional."
                },
                totalPrice: {
                    type: "number",
                    description: "Total price for the reservation in local currency (e.g., 3000 for 3000 TL). CRITICAL: If you mentioned any price to the guest (e.g., 'toplam 3000 TL', 'gecelik 1000 TL toplam 3000 TL'), you MUST include this parameter with the total amount. Extract the number from your conversation."
                },
                adultPrice: {
                    type: "number",
                    description: "Price per adult if mentioned separately. Optional."
                },
                childPrice: {
                    type: "number",
                    description: "Price per child if mentioned separately. Optional."
                },
                numberOfAdults: {
                    type: "number",
                    description: "Number of adults if specified separately from total guests. Optional."
                },
                numberOfChildren: {
                    type: "number",
                    description: "Number of children if specified separately. Optional."
                }
            },
            required: ["checkIn", "checkOut", "guests", "guestName", "roomType"]
        }
    }
}

export const CREATE_ORDER_TOOL = {
    type: "function",
    function: {
        name: "create_order",
        description: "Create a new restaurant order. CRITICAL: You MUST have verbally confirmed all details (items, address, customer name) with the user and received a clear confirmation before using this tool. Use this when the customer wants to place an order.",
        parameters: {
            type: "object",
            properties: {
                customer_phone: {
                    type: "string",
                    description: "Customer's phone number if mentioned explicitly"
                },
                delivery_address: {
                    type: "string",
                    description: "Complete delivery address if provided"
                },
                customer_name: {
                    type: "string",
                    description: "Customer's name if mentioned"
                },
                notes: {
                    type: "string",
                    description: "Special instructions like 'No onions'"
                },
                items: {
                    type: "string",
                    description: "List of items and quantities, e.g. '1 Adana Acılı, 2 Ayran'"
                },
                total_amount: {
                    type: "number",
                    description: "Total estimated price if discussed"
                }
            },
            required: ["items"]
        }
    }
}