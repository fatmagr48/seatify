from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..websocket.manager import manager

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/trips/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: int):
    await manager.connect(websocket, trip_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, trip_id)

@router.websocket("/admin")
async def admin_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    if "admin" not in manager.active_connections:
        manager.active_connections["admin"] = []
    manager.active_connections["admin"].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, 0)
