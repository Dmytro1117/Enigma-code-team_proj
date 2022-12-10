import storageAPI from './storageAPI';
import firebaseAPI from './firebaseAPI';
import modalMovieCard from './modalMovieCardAPI';

function lybBtnClickAction(e) {
  if (e.target.dataset.action === 'add') {
    if (firebaseAPI.instance.userId) {
      addToFirebase(+e.target.dataset.id, e.target.dataset.type);
    } else {
      addToLyb(+e.target.dataset.id, e.target.dataset.type);
      modalMovieCard.showLybrary(e.target.dataset.type);
    }
  } else {
    if (firebaseAPI.instance.userId) {
      removeFromFirebase(+e.target.dataset.id, e.target.dataset.type);
    } else {
      removeFromLyb(+e.target.dataset.id, e.target.dataset.type);
      modalMovieCard.showLybrary(e.target.dataset.type);
    }
  }
}

function addToLyb(id, type) {
  const lyb = storageAPI.load(type) || [];
  if (lyb.find(info => info?.id === id)) return;
  const movieInfo = storageAPI.load('modalInfo');
  lyb.push(movieInfo);
  storageAPI.save(type, lyb);
}
async function addToFirebase(id, type) {
  const isInLyb = await firebaseAPI.instance.isInLyb(id, type);
  console.log(`Is movie in DB? `, isInLyb);
  if (isInLyb) return;
  const movieInfo = storageAPI.load('modalInfo');
  firebaseAPI.instance.addToLyb(id, type, movieInfo);
}

async function removeFromFirebase(id, type) {
  firebaseAPI.instance.removeFromLyb(id, type);
}

function removeFromLyb(id, type) {
  const lyb = storageAPI.load(type) || [];
  lyb.splice(
    lyb.findIndex(info => info?.id === id),
    1
  );
  storageAPI.save(type, lyb);
}

export default {
  lybBtnClickAction,
};
