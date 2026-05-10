import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer } from "./Toast";
import type { ToastData } from "./Toast";

const baseToast: ToastData = {
  id: "t1",
  type: "mention",
  senderName: "Alice",
  senderAvatar: null,
  preview: "Hey @you check this out",
};

describe("ToastContainer", () => {
  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a toast with sender name and preview", () => {
    render(<ToastContainer toasts={[baseToast]} onDismiss={vi.fn()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText(/Hey @you/)).toBeInTheDocument();
  });

  it("shows 'Mentioned you:' prefix for mention toasts", () => {
    render(<ToastContainer toasts={[baseToast]} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Mentioned you/)).toBeInTheDocument();
  });

  it("does not show 'Mentioned you:' prefix for DM toasts", () => {
    const dmToast: ToastData = { ...baseToast, id: "t2", type: "dm", preview: "hey!" };
    render(<ToastContainer toasts={[dmToast]} onDismiss={vi.fn()} />);
    expect(screen.queryByText(/Mentioned you/)).not.toBeInTheDocument();
    expect(screen.getByText("hey!")).toBeInTheDocument();
  });

  it("calls onDismiss when the ✕ button is clicked", async () => {
    const onDismiss = vi.fn();
    render(<ToastContainer toasts={[baseToast]} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText("✕"));
    expect(onDismiss).toHaveBeenCalledWith("t1");
  });

  it("calls onClick and onDismiss when the toast body is clicked", async () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    const toast: ToastData = { ...baseToast, onClick };
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText("Alice"));
    expect(onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith("t1");
  });

  it("auto-dismisses after 5 seconds", async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ToastContainer toasts={[baseToast]} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onDismiss).toHaveBeenCalledWith("t1");
    vi.useRealTimers();
  });

  it("renders multiple toasts", () => {
    const toasts: ToastData[] = [
      { ...baseToast, id: "t1", senderName: "Alice" },
      { ...baseToast, id: "t2", senderName: "Bob" },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
