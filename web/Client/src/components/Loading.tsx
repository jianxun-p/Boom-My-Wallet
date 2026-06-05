import { Spinner } from "@/components/ui/spinner"

export default function Loading({
    loading,
    className,
}: {loading: boolean, className?: string}) {
    const extraClassName = className ?? "bg-[#ffffffc0]";
    return (
        loading && <div className={'fixed inset-0 z-100 content-center ' + extraClassName}>
            <Spinner className="size-12 z-100 m-auto" />
        </div>
    );
}
