import json
import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""

    def __init__(self):
        # Map of paper_id -> set of connected websockets
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, paper_id: str):
        """Accept and register a new WebSocket connection"""
        client_info = (
            f"{websocket.client.host}:{websocket.client.port}"
            if websocket.client
            else "unknown"
        )
        logger.info(
            f"[WebSocket] Accepting connection for {paper_id} from {client_info}"
        )

        await websocket.accept()

        if paper_id not in self.active_connections:
            self.active_connections[paper_id] = set()

        self.active_connections[paper_id].add(websocket)
        total_connections = len(self.active_connections[paper_id])
        total_papers = len(self.active_connections)
        logger.info(
            f"[WebSocket] Connection registered: {paper_id} | Active connections for this paper: {total_connections} | Total papers with connections: {total_papers}"
        )

    def disconnect(self, websocket: WebSocket, paper_id: str):
        """Remove a WebSocket connection"""
        if paper_id in self.active_connections:
            was_present = websocket in self.active_connections[paper_id]
            self.active_connections[paper_id].discard(websocket)
            remaining = len(self.active_connections[paper_id])

            # Clean up empty sets
            if not self.active_connections[paper_id]:
                del self.active_connections[paper_id]
                logger.info(
                    f"[WebSocket] Disconnected: {paper_id} | No more connections for this paper"
                )
            else:
                logger.info(
                    f"[WebSocket] Disconnected: {paper_id} | Remaining connections: {remaining}"
                )

            if not was_present:
                logger.warning(
                    f"[WebSocket] Attempted to disconnect websocket that wasn't registered for {paper_id}"
                )

    async def send_update(self, paper_id: str, version: str, data: dict):
        """
        Send update to all connections watching a specific paper

        Args:
            paper_id: ArXiv paper ID
            version: Paper version
            data: Update data (status, progress, etc.) - should use camelCase keys
        """
        if paper_id not in self.active_connections:
            logger.debug(
                f"[WebSocket] No active connections for {paper_id}, skipping update"
            )
            return

        message = {
            "paper_id": paper_id,
            "version": version,
            "type": "document_update",
            "data": data,
        }
        message_str = json.dumps(message)

        connection_count = len(self.active_connections[paper_id])
        logger.info(
            f"[WebSocket] Sending update to {connection_count} connection(s) for {paper_id} v{version}: {json.dumps(data, indent=2)}"
        )

        # Send to all connected clients
        disconnected = set()
        sent_count = 0
        for websocket in self.active_connections[paper_id]:
            try:
                await websocket.send_text(message_str)
                sent_count += 1
            except Exception as e:
                logger.error(
                    f"[WebSocket] Error sending to websocket for {paper_id}: {e}"
                )
                disconnected.add(websocket)

        logger.info(
            f"[WebSocket] Successfully sent update to {sent_count}/{connection_count} connection(s) for {paper_id}"
        )

        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket, paper_id)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        message_str = json.dumps(message)

        for paper_connections in self.active_connections.values():
            for websocket in paper_connections:
                try:
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.error(f"Error broadcasting: {e}")


# Global connection manager instance
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get connection manager for dependency injection"""
    return manager
