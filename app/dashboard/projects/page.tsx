import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Link from "next/link";
import { canCreateProjects } from "@/lib/permissions";
import DeleteProjectButton from "./DeleteProjectButton";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const canManage = canCreateProjects(session!.user.role);

  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: {
          stockMovements: true,
          challans: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return (
    <div>
      <Header
        title="Projects"
        subtitle="Manage events, camps, and rentals"
        action={
          canManage ? (
            <Link href="/dashboard/projects/new" className="btn btn-primary">
              + New Project
            </Link>
          ) : undefined
        }
      />

      <div className="p-8">
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Project Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Start Date</th>
                  <th className="table-header">End Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Items Allocated</th>
                  <th className="table-header">Challans</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      No projects found. Create your first project to get started.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td className="table-cell font-medium">{project.name}</td>
                      <td className="table-cell">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {project.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="table-cell">{project.location}</td>
                      <td className="table-cell">
                        {new Date(project.startDate).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        {project.endDate
                          ? new Date(project.endDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${project.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : project.status === "COMPLETED"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {project._count.stockMovements}
                      </td>
                      <td className="table-cell">{project._count.challans}</td>
                      <td className="table-cell">
                        <div className="flex gap-2 items-center">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View
                          </Link>
                          {canManage && (
                            <DeleteProjectButton projectId={project.id} projectName={project.name} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
