import { createContext, useContext } from "react";
import type { User } from "../types/user";
// import { useNavigate } from "react-router";

export const UserCtx = createContext<User | null>(null);

export function useUser(): User {
    const context = useContext(UserCtx);
    // const navigate = useNavigate();
    if (!context) {
        return Object.assign({}, {
            uid: "", 
            token: "",
        })
    }
    return Object.assign({}, context);
}