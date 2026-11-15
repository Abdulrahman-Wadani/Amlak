import { useEffect, useState, type SubmitEvent } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { CircleAlert } from "lucide-react"
import { cn } from "cn"
import type { Place } from "@amlak/shared"
import { S } from "@/lib/dom-style"
import { useAuth } from "@/lib/auth"
import { createAsset, getPlaces,createTicket } from "@/lib/api"
import { assetInput } from "@/lib/validators"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Form from "@/components/form"

export const Route = createFileRoute("/_authenticated/test")({
  component: test,
  
})



function test(){
  return <Form label={["العقار","اسم الاصل","النوع","الحالة","تاريخ الشراء"]} callable={createTicket} args={[token, p]} />
}
