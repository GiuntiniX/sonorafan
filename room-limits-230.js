'use strict';
// Limites globais do SonoraFan. Nunca apagar automaticamente salas existentes
// ao introduzir um teto novo: bloquear apenas novas criações.
const MAX_ROOMS = 30;
const MAX_PEOPLE_PER_ROOM = 50;
function canCreateRoom(rooms) {
  return !!rooms && Number.isInteger(rooms.size) && rooms.size < MAX_ROOMS;
}
function activeRoomCount(io, slug) {
  const members = io?.sockets?.adapter?.rooms?.get(slug);
  return members?.size || 0;
}
function canJoinRoom(io, slug, socketId) {
  const members = io?.sockets?.adapter?.rooms?.get(slug);
  return !!(members?.has(socketId) || (members?.size || 0) < MAX_PEOPLE_PER_ROOM);
}
module.exports = { MAX_ROOMS, MAX_PEOPLE_PER_ROOM, canCreateRoom, activeRoomCount, canJoinRoom };
