import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateProjects } from "@/lib/permissions";

// DELETE /api/bundle-templates/[id] - Delete template
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !canCreateProjects(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.bundleTemplate.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting bundle template:", error);
        return NextResponse.json(
            { error: "Failed to delete bundle template. It may be associated with records." },
            { status: 500 }
        );
    }
}
