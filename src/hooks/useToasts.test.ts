import { renderHook, act } from "@testing-library/react";
import { useToasts } from "./useToasts";

describe("useToasts", () => {
  it("starts with an empty toast list", () => {
    const { result } = renderHook(() => useToasts());
    expect(result.current.toasts).toHaveLength(0);
  });

  it("adds a toast with a generated id", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({
        type: "mention",
        senderName: "Alice",
        senderAvatar: null,
        preview: "hello",
      });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].senderName).toBe("Alice");
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it("accumulates multiple toasts", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({ type: "mention", senderName: "A", senderAvatar: null, preview: "a" });
      result.current.addToast({ type: "dm", senderName: "B", senderAvatar: null, preview: "b" });
    });
    expect(result.current.toasts).toHaveLength(2);
  });

  it("gives each toast a unique id", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({ type: "mention", senderName: "A", senderAvatar: null, preview: "a" });
      result.current.addToast({ type: "mention", senderName: "B", senderAvatar: null, preview: "b" });
    });
    const ids = result.current.toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("removes a toast by id", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({ type: "mention", senderName: "A", senderAvatar: null, preview: "a" });
    });
    const id = result.current.toasts[0].id;
    act(() => { result.current.dismiss(id); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("only removes the specified toast when multiple exist", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({ type: "mention", senderName: "A", senderAvatar: null, preview: "a" });
      result.current.addToast({ type: "dm", senderName: "B", senderAvatar: null, preview: "b" });
    });
    const firstId = result.current.toasts[0].id;
    act(() => { result.current.dismiss(firstId); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].senderName).toBe("B");
  });

  it("dismiss with unknown id is a no-op", () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast({ type: "mention", senderName: "A", senderAvatar: null, preview: "a" });
    });
    act(() => { result.current.dismiss("nonexistent"); });
    expect(result.current.toasts).toHaveLength(1);
  });
});
